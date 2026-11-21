class ApplicationMailer < ActionMailer::Base
  default from: ENV.fetch("MAIL_FROM", "GBM <nao-responda@gbm.com.br>")
  layout "mailer"
end
