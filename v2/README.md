# Smart Farm — v2

Cada talhão é um servidor TCP que envia leituras ao gateway conectado. O gateway é cliente dos talhões e do serviço gRPC de médias; grava as médias em seu SQLite e também é servidor TCP para a FOG. A FOG inicia conexões aos gateways, recebe novas médias e chama o serviço gRPC de anomalias. Um alerta informa o endereço do gateway **e** o endereço completo do talhão.

## Executar localmente

Requer Node.js 24.15 ou superior. Execute `pnpm install` e `pnpm run build` dentro de `v2/`. Depois, em terminais separados:

```bash
pnpm run start:microservice -- --port=4000
pnpm run start:anomaly -- --port=4100
pnpm run start:plots -- --port=5001
pnpm run start:plots -- --port=5002
pnpm run start:gateway -- --lots=5001,5002 --service=4000 --port=8080 --window-ms=5000 --publish-ms=5000
pnpm run start:fog -- --gateways=8080 --anomaly=4100
```

O gateway tenta reconectar a talhões que ainda não subiram. Outro gateway pode usar `--lots=5003 --port=8081`; inclua `8081` em `--gateways=8080,8081` na FOG. Endereços sem host usam `127.0.0.1`.

`--window-ms` define quantos milissegundos anteriores a cada cálculo contam para a média; `--publish-ms` define a cadência do cálculo e da gravação. O servidor do gateway transmite novos registros do SQLite à FOG nessa mesma cadência. Uma janela sem leituras não gera registro. Janelas se sobrepõem quando `window-ms` é maior que `publish-ms`. O antigo `--batch-size` foi substituído por esses parâmetros temporais.

O comando `start:gateway` inicia cliente e servidor juntos. `--client-only` desliga o servidor; `--server-only` desliga o cliente. Nos dois casos, `--lots` seleciona o mesmo banco `data/gateway-<portas>.sqlite`; em modo cliente, `--service` é obrigatório. O servidor usa `--port=8080` por padrão. Para separar os papéis em dois processos, inicie ambos com a mesma lista de talhões, um com `--client-only` e outro com `--server-only`.

## Regras de anomalia

O serviço sinaliza temperatura acima de **35 °C**, umidade abaixo de **30%** ou chuva acima de **40 mm/h**. Ajuste apenas os limites existentes, por exemplo:

```bash
pnpm run start:anomaly -- --port=4100 --temperature-max=36 --humidity-min=35 --rainfall-max=45
```

A FOG preserva `plot_address` do registro do gateway enquanto aguarda a resposta gRPC; assim um alerta identifica o talhão mesmo que vários gateways e talhões sejam analisados simultaneamente. A FOG se conecta ao gateway, nunca o contrário. Novas conexões recebem somente registros futuros; não há replay após desconexão.

## Contratos e máquinas diferentes

As leituras usam o contrato de `src/sensors/protocol.ts`; as classes em `src/sensors/sensors.ts` definem as unidades. O gateway transmite um JSON por linha contendo ID, `plot_address`, horário, quantidade de amostras, médias e unidades. A FOG chama `AnomalyService.Check` definido em `proto/anomalies.proto`; o serviço de médias usa `proto/averages.proto`. Os `.proto` são carregados em tempo de execução, sem geração de código.

Em máquinas diferentes, instale e compile `v2/` em cada uma. Abra as portas TCP dos talhões (`5001`, `5002`) para o gateway, a porta TCP do gateway (`8080`) para a FOG, a porta gRPC das médias (`4000`) para o gateway e a porta gRPC de anomalias (`4100`) para a FOG. Use endereços completos:

```bash
# Gateway: talhões e serviço de médias remotos
pnpm run start:gateway -- --lots=192.168.1.21:5001,192.168.1.22:5002 --service=192.168.1.30:4000 --port=8080

# FOG: gateway e serviço de anomalias remotos
pnpm run start:fog -- --gateways=192.168.1.40:8080 --anomaly=192.168.1.50:4100
```

Os logs seguem `[Módulo::Client|Server][endereço] Mensagem`. Cada processo escreve em seu próprio stdout, mas todos usam o mesmo formatador. Como na v1, o fluxo dos sensores usa JSON diretamente por evento `data` para manter o exemplo acadêmico simples; o fluxo contínuo gateway–FOG usa linhas para delimitar mensagens TCP corretamente.
