class LoginCodeMailer < ApplicationMailer
  def code
    @code = params[:code]
    mail(to: params[:email], subject: "Seu código de acesso GBM: #{@code}")
  end
end
