<p align="center">
  <img src="../assets/readme/banners/fastify.png" alt="Fastify" width="100%">
</p>

# Deploy

O processo compartilhado está em [QA_RENDER.md](https://github.com/Solierrr/docs-warehouse/blob/main/readme/deploy/QA_RENDER.md) e [PROD_GKE_ARGOCD.md](https://github.com/Solierrr/docs-warehouse/blob/main/readme/deploy/PROD_GKE_ARGOCD.md). A imagem deste serviço compila TypeScript em Node.js 24 e executa somente os artefatos e dependências de runtime, com usuário `node`.

## Ambientes

Os destinos abaixo vêm do contrato e dos manifestos, sem comprovação de disponibilidade ao vivo.

| Ambiente | Onde | Endereço |
|---|---|---|
| Local | processo Node ou compose | [API local](http://localhost:8083) |
| QA | Render | [API de QA](https://api-email-6swz.onrender.com) |
| Produção declarada | Service interno no GKE | `http://api-email:8083`, acessível dentro do cluster |

O QA está publicado no Render, e a main contém os dois transportes, com a escolha feita pela configuração do ambiente.

Os manifestos de produção são a [aplicação do Argo CD](https://github.com/Solierrr/infra-gitops/blob/main/apps/api/api-email.yaml), o [Deployment](https://github.com/Solierrr/infra-gitops/blob/main/services/api-email/deployment.yaml) e o [Service](https://github.com/Solierrr/infra-gitops/blob/main/services/api-email/service.yaml), este do tipo `ClusterIP` e sem Ingress, e o serviço está em operação no cluster.

## Imagem e segredos

O Dockerfile tem build em duas etapas, instala pelo lockfile e copia o pacote visual de `vendor/`. O runtime usa a porta 8083 e escuta em todas as interfaces na imagem. O `.env` não é incorporado.

O entrypoint inicia o comando diretamente quando não recebe as duas credenciais Universal Auth e, se elas estiverem presentes, tenta executar o CLI do Infisical, que a imagem atual não instala. Por isso o QA recebe as variáveis injetadas pela plataforma.

As variáveis `EMAIL_FROM` e `EMAIL_ALLOWED_ORIGINS` são obrigatórias, o transporte SMTP exige o host e, quando usados, o usuário e a senha em par, e o Brevo exige `BREVO_API_KEY`. O `APP_ENV` distingue desenvolvimento, QA e produção e controla a exigência de HTTPS nos links, e as chaves por chamador continuam necessárias nos dois transportes.

O serviço não cria conta de provedor nem configura autorização de domínio ou DNS. Essas condições são externas ao código.

## Particularidades da produção declarada

O Deployment aponta para a imagem de versão `0.3.0`, seleciona Brevo, carrega `api-email-secrets` e declara uma réplica. Readiness e liveness ainda apontam para `/health`, portanto a prontidão do manifesto não verifica o transporte. O caminho apropriado para essa verificação no serviço é `/ready`.

O manifesto não define `DOCS_ENABLED` explicitamente, e a variável pode vir do Secret, enquanto o workflow `environment-status.yml` do serviço cobre apenas o QA.

## Publicação e operação

O push na main chama o workflow compartilhado de publicação de imagem. O release-please usa a versão de `package.json` e atualiza o contrato OpenAPI pela marca de versão. O percurso entre repositórios está em [RELEASE_AND_DEPLOY.md](https://github.com/Solierrr/docs-warehouse/blob/main/docs/flows/RELEASE_AND_DEPLOY.md).

No Render, o `healthCheckPath` deve ser `/ready`, que no SMTP abre a conexão e autentica sem enviar mensagem e no Brevo consulta o acesso à API pelo método de verificação do transporte, esperando no máximo dois segundos pela resposta.

O CORS permite ler a documentação a partir das origens autorizadas de QA. Isso não transforma a chave de serviço em credencial para pessoas. Os consumidores de produção devem chamar a API pelo backend.
