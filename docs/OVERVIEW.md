<p align="center">
  <img src="../assets/readme/banners/fastify.png" alt="Fastify" width="100%">
</p>

# Visão de produto

O serviço centraliza as mensagens transacionais enviadas às pessoas que usam a plataforma. Os outros serviços decidem quando uma mensagem deve existir, quem a recebe e quais dados ela apresenta. Este serviço mantém um conjunto pequeno de modelos, monta o conteúdo e pede seu envio.

## Mensagens disponíveis

Os modelos cobrem os acontecimentos abaixo, em português, inglês e espanhol.

| Mensagem                          | O que apresenta                                           |
| --------------------------------- | --------------------------------------------------------- |
| Confirmação de e-mail pessoal     | link para confirmar o endereço informado                  |
| Recuperação de senha              | link para continuar a redefinição                         |
| Convite para empresa              | nome da empresa e ação para continuar o convite           |
| Convite para projeto              | projeto, papel da pessoa, validade e link do convite      |
| Exclusão da conta                 | confirmação do encerramento, sem botão de ação            |
| Cadastro aprovado                 | aviso de aprovação e link para consultar o cadastro       |
| Cadastro reprovado                | motivo da reprovação e link do cadastro                   |
| Modelo de placa aprovado          | nome do modelo, imagem e dados técnicos quando fornecidos |
| Confirmação de e-mail empresarial | nome da empresa e link de confirmação                     |

## Regras

Cada pedido atende um destinatário. O serviço aceita somente modelos e idiomas conhecidos. O português é usado quando o idioma não é informado. O nome da pessoa é opcional, e os detalhes de empresa, projeto, modelo ou reprovação são exigidos quando fazem parte da mensagem escolhida.

O link de ação deve apontar para um endereço autorizado da plataforma. A mensagem de exclusão da conta não apresenta botão, mesmo que um link tenha sido recebido. O serviço não cria os links de confirmação, não gera tokens e não verifica se a pessoa concluiu a ação.

O convite de projeto mostra o papel e a validade informados pelo serviço chamador. A data aparece em UTC. A aprovação de modelo mostra fabricante e potência apenas quando fornecidos, sem preencher esses dados por conta própria. Quando falta a imagem do modelo, usa uma imagem incorporada de referência.

O aceite do envio significa que o transporte aceitou a mensagem. Ele não informa se a pessoa recebeu, abriu ou leu o e-mail. Hoje não há consulta de histórico de envios. Novas tentativas automáticas neste serviço continuam sendo uma decisão aberta. <!-- PENDENTE: 4 -->

## Onde aparece para a pessoa

O resultado chega à caixa de e-mail, com assunto, texto e apresentação do modelo escolhido. A prévia permite conferir a mensagem antes de enviá-la. No desenvolvimento local, uma caixa de captura reúne os exemplos para revisão.

## Relação com a plataforma

O cadastro central usa o serviço para convites de projeto. O serviço de acesso já contém um cliente para solicitar mensagens de conta, e a autenticação desse cliente está migrando para a chave por chamador. A disponibilidade dessas integrações depende da configuração dos ambientes.

O histórico de entregas em banco foi decidido pelo responsável, mas ainda não foi implementado. O serviço permanece sem armazenamento próprio de mensagens ou destinatários.
