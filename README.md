# Estudantes
- Caio H Perlin
- Caio R Loyer

# Proposta de Atividade
Há sensores de temperatura, umidade e chuva instalados em cada talhão de uma fazenda. Além dos sensores, cada talhão possui um gateway (EDGE) que organiza os dados enviados pelos sensores. Deve ser implementado um microsserviço que calcule e retorne a média das temperaturas/medições.

Os gateways devem armazenar (em memória ou num banco de dados) as médias calculadas.

# Observações
- É necessário ter interfaces bem definidas entre todos os componentes
- Toda a comunicação deve ser feita através de sockets TCP com typescript, utilizando a implementação da standard lib `node:net`
- Deve ser possível subir novos gateways quando quiser e o app deve continuar funcionando normalmente