# Regras de acesso a um livro (decididas com o Cleber em nov/2026):
#   ler no app            -> só com assinatura ativa
#   baixar o PDF          -> com assinatura ativa; o download registra a posse
#   depois de cancelar    -> só baixar de novo os PDFs que já tinha baixado
class AccessPolicy
  def initialize(account, title)
    @account = account
    @title = title
  end

  def active? = @account.subscription_active?
  def owned? = @account.owns?(@title)

  def can_read? = active?
  def can_download? = active? || owned?

  def to_h = { can_read: can_read?, can_download: can_download?, owned: owned?, subscription_active: active? }
end
