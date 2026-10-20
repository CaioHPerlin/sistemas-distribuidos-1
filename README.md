# Sistemas Distribuídos — versões do projeto

Projeto acadêmico de monitoramento de talhões, desenvolvido por Caio H Perlin e Caio R Loyer. Sensores simulados produzem leituras de temperatura, umidade e chuva; gateways organizam os dados, solicitam o cálculo das médias a um microsserviço e armazenam os resultados localmente em SQLite.

O repositório passa a reunir versões independentes do projeto para acompanhar sua evolução e comparar diferentes componentes e formas de comunicação.

| Pasta | Objetivo | Estado atual |
| --- | --- | --- |
| [`v1/`](v1/README.md) | Preservar a implementação de referência com sockets TCP e JSON. | Contém o projeto existente antes da reorganização. |
| [`v2/`](v2/README.md) | Evoluir o projeto com novos componentes e comunicação por RPC. | Começa como uma cópia idêntica de `v1`; as mudanças para RPC serão feitas gradualmente. |

Cada versão possui seu próprio código-fonte, `package.json`, arquivos de lock, configuração TypeScript, `.gitignore`, configuração de formatação e README com instruções de execução. O histórico Git permanece único, na raiz do repositório.

## Executar uma versão

É necessário Node.js 24.15 ou superior. Entre na pasta da versão desejada antes de instalar dependências, compilar ou iniciar os processos:

```bash
cd v1 # ou: cd v2
pnpm install
pnpm run build
```

Em terminais separados, sempre dentro da mesma pasta de versão:

```bash
pnpm run start:microservice -- --port=4000
pnpm run start:sensors -- --port=5001
pnpm run start:gateway -- --service=4000 --lots=5001
```

Consulte o README de cada versão para os demais parâmetros e exemplos de execução em máquinas diferentes. Ao executar versões simultaneamente na mesma máquina, escolha portas diferentes para evitar conflitos.

## Desenvolvimento e registros locais

As próximas alterações de componentes e RPC serão feitas em `v2/`, mantendo `v1/` como referência para comparação. A reorganização inicial não altera o comportamento da aplicação nem implementa RPC.

Dependências (`node_modules/`), arquivos compilados (`dist/`) e dados locais (`data/`) pertencem a cada versão e continuam ignorados pelo Git. Os arquivos locais já existentes, incluindo os cenários Docker, relatórios, bancos e documentos dos achados em `data/network-scenario/`, foram preservados em `v1/` e copiados para `v2/`. Os registros históricos mantêm os caminhos e comandos capturados na ocasião; para executar novamente, use os caminhos dentro da versão escolhida.

As configurações de ferramentas do ambiente permanecem na raiz, junto ao diretório Git. Não é necessário criar outro repositório dentro de cada versão.
