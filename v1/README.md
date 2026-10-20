# Monitoramento distribuído de talhões

Estudantes: Caio H Perlin e Caio R Loyer.

Cada talhão é um servidor TCP com três sensores: temperatura, umidade e chuva. Cada servidor aceita um gateway por vez. O gateway (EDGE) conecta-se aos talhões, agrupa as leituras de cada endereço separadamente, pede as médias ao microsserviço e salva os resultados em seu próprio SQLite.

## Executar

Requer Node.js 24.15 ou superior. Em terminais separados:

```bash
npm install
npm run build
npm run start:microservice -- --port=4000
npm run start:sensors -- --port=5001
npm run start:gateway -- --service=4000 --lots=5001,5002
```

O gateway aceita T1 imediatamente e tenta conectar a T2 a cada dois segundos. Para iniciar T2 depois, sem reiniciar o gateway:

```bash
npm run start:sensors -- --port=5002
```

Outro conjunto de talhão e gateway pode usar o mesmo microsserviço:

```bash
npm run start:sensors -- --port=5003
npm run start:gateway -- --service=4000 --lots=5003
```

Parâmetros da CLI:

```text
start:microservice -- [--port=4000]
start:sensors -- --port=<porta-talhão> [--interval-ms=1000]
start:gateway -- --service=<[host:]porta> --lots=<[host:]porta,...> [--batch-size=5]
```

Se `host` for omitido, o gateway usa `127.0.0.1`. Por isso os comandos só com portas continuam servindo para executar tudo na mesma máquina.

O gateway é identificado apenas pelas portas dos talhões, em ordem crescente. Com `--lots=5001,5002`, seu banco será `data/gateway-5001-5002.sqlite`; o mesmo arquivo é reutilizado ao reiniciar o gateway. Para consultar:

```bash
node --input-type=module -e 'import { DatabaseSync } from "node:sqlite"; const db = new DatabaseSync("data/gateway-5001-5002.sqlite"); console.table(db.prepare("SELECT * FROM averages").all()); db.close()'
```

O tamanho do lote é a quantidade de leituras **por talhão** usada em cada cálculo. Para mudar de 5 para 10, por exemplo, execute `npm run start:gateway -- --service=4000 --lots=5001,5002 --batch-size=10`. Para direcionar outro gateway a um segundo microsserviço, inicie-o com `--port=4001` e use `--service=4001` no gateway.

## Executar em máquinas diferentes

Instale o projeto e rode `npm install` e `npm run build` em **cada máquina**. No exemplo abaixo, todas estão na mesma rede e usam estes endereços:

| Máquina | Endereço | Processo |
| --- | --- | --- |
| T1 | `192.168.1.21` | Talhão na porta `5001` |
| T2 | `192.168.1.22` | Talhão na porta `5002` |
| G1 | `192.168.1.40` | Gateway e seu SQLite |
| M1 | `192.168.1.30` | Microsserviço na porta `4000` |

Execute um comando em cada máquina, mantendo os processos abertos:

```bash
# Em M1 (192.168.1.30)
npm run start:microservice -- --port=4000

# Em T1 (192.168.1.21)
npm run start:sensors -- --port=5001

# Em T2 (192.168.1.22)
npm run start:sensors -- --port=5002

# Em G1 (192.168.1.40)
npm run start:gateway -- --service=192.168.1.30:4000 --lots=192.168.1.21:5001,192.168.1.22:5002
```

Substitua os IPs pelos da sua rede. Libere as portas `5001` e `5002` **nas máquinas dos talhões** e `4000` **na máquina do microsserviço** para conexões vindas do gateway. Talhões e microsserviço já escutam em todas as interfaces de rede; o gateway apenas inicia conexões, sem precisar de porta de entrada. Cada talhão aceita um gateway por vez. As médias ficam em `data/` **na máquina G1**, com o endereço completo do talhão e as unidades em cada linha do banco. Se T2 iniciar depois, G1 continuará tentando conectar a ele a cada dois segundos.

## Interfaces TCP

As classes em `src/sensors/sensors.ts` são a fonte de verdade dos sensores e de suas unidades: temperatura em °C, umidade em % e chuva em mm/h. O talhão envia valores e unidades no contrato `SensorReading` de `src/sensors/protocol.ts`. O microsserviço define `Input` e `Output` no topo de `src/microservice/server.ts`: recebe grupos de números e devolve as médias na mesma ordem, sem conhecer sensores, talhões ou banco. Por exemplo, `{"groups":[[20,22],[60,70]]}` resulta em `{"averages":[21,65]}`. O gateway associa cada posição da resposta à medida correspondente. O endereço `host:porta` da conexão identifica o talhão no gateway; não há IDs nas mensagens.

Como no [exemplo TCP da turma](https://github.com/CaioHPerlin/sistemas-distribuidos-tcp-ts/), cada evento `data` é tratado como um JSON completo. É uma simplificação didática: TCP não preserva limites de mensagens; uma implementação de produção precisaria delimitá-las.

## Adicionar um novo sensor

Exemplo: um sensor de luminosidade, cuja medida será chamada `light` e cuja unidade será `lux`.

1. Em `src/sensors/sensors.ts`, crie `LightSensor extends Sensor`. Defina `readonly unit = 'lux'` **nessa classe** e chame `super(mínimo, máximo, passo)` no construtor. Este arquivo é a fonte de verdade da faixa de oscilação e da unidade; `read()` já é herdado.
2. Em `src/sensors/protocol.ts`, acrescente `light: number` a `SensorReading`, `light: string` a `SensorUnits` e verifique ambos em `isSensorReading`. Assim a nova medida e sua unidade fazem parte da interface TCP do talhão.
3. Em `src/sensors/server.ts`, instancie `LightSensor`. Em cada leitura enviada ao gateway, inclua `light: light.read()` no objeto principal e `light: light.unit` dentro de `units`.
4. Em `src/gateway/main.ts`, acrescente `readings.map((reading) => reading.light)` aos `groups` enviados ao microsserviço. Associe a nova posição de `response.averages` a `light` e mostre a média com `first.units.light` no log. **Não é preciso alterar o microsserviço**: ele calcula médias para qualquer grupo de números.
5. Em `src/gateway/database.ts`, acrescente `light: number` à interface `Averages`, adicione as colunas `light` e `light_unit` à tabela `averages` e inclua os dois valores no `INSERT` de `save`. O banco de uma nova instância de gateway será criado com essas colunas.
6. Rode `npm run build` e inicie talhão, microsserviço e gateway com os comandos acima. Depois de formar um lote, consulte o SQLite com `SELECT light, light_unit FROM averages` e confirme os valores. Se estiver usando máquinas diferentes, atualize o código e compile em todas elas antes de iniciar os processos.
