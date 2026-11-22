# Sistemas Distribuídos — versões do projeto

Projeto acadêmico de monitoramento de talhões, desenvolvido por Caio H Perlin e Caio R Loyer. Sensores simulados produzem leituras de temperatura, umidade e chuva; gateways solicitam médias a um serviço e armazenam os resultados em SQLite.

O repositório passa a reunir versões independentes do projeto para acompanhar sua evolução e comparar diferentes componentes e formas de comunicação.

| Pasta | Objetivo | Estado atual |
| --- | --- | --- |
| [`v1/`](v1/README.md) | Preservar a implementação de referência com sockets TCP e JSON. | Contém o projeto existente antes da reorganização. |
| [`v2/`](v2/README.md) | Demonstrar o fluxo talhões → gateways → FOG. | Médias e anomalias usam gRPC/Protobuf; a FOG identifica o talhão que gerou cada alerta. |

Cada versão possui seu próprio código-fonte, `package.json`, arquivos de lock, configuração TypeScript, `.gitignore`, configuração de formatação e README com instruções de execução. O histórico Git permanece único, na raiz do repositório.

## Executar uma versão

É necessário Node.js 24.15 ou superior. Entre na pasta da versão desejada antes de instalar dependências, compilar ou iniciar os processos:

```bash
cd v1 # ou: cd v2
pnpm install
pnpm run build
```

Em terminais separados, sempre dentro da mesma pasta de versão, inicie o serviço de médias, um talhão e um gateway:

```bash
pnpm run start:microservice -- --port=4000
pnpm run start:plots -- --port=5001
pnpm run start:gateway -- --service=4000 --lots=5001
```

Na `v2/`, inicie também `pnpm run start:anomaly -- --port=4100` e `pnpm run start:fog -- --gateways=8080 --anomaly=4100` para completar o fluxo. Consulte o README de cada versão para parâmetros e exemplos em máquinas diferentes. Use portas distintas se executar as duas versões simultaneamente.

## Desenvolvimento e registros locais

`v1/` permanece como referência TCP/JSON; a arquitetura com FOG e gRPC está em `v2/`. O teste `bash e2e/run.sh`, executado dentro de `v2/`, usa Docker Compose para subir dois gateways, três talhões por gateway, a FOG e os dois serviços. Ele verifica os seis talhões nos SQLite corretos e nos alertas da FOG.

Dependências (`node_modules/`), arquivos compilados (`dist/`) e dados locais (`data/`) pertencem a cada versão e continuam ignorados pelo Git. Os arquivos locais já existentes, incluindo os cenários Docker, relatórios, bancos e documentos dos achados em `data/network-scenario/`, foram preservados em `v1/` e copiados para `v2/`. Os registros históricos mantêm os caminhos e comandos capturados na ocasião; para executar novamente, use os caminhos dentro da versão escolhida.

As configurações de ferramentas do ambiente permanecem na raiz, junto ao diretório Git. Não é necessário criar outro repositório dentro de cada versão.
