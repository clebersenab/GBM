class PasswordMailer < ApplicationMailer
  def reset
    @code = params[:code]
    mail(to: params[:email], subject: "Código para criar uma nova senha no GBM: #{@code}")
  end
end
