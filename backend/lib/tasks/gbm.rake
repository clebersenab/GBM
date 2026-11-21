namespace :gbm do
  # Cria ou atualiza uma conta liberada, sem senha no código-fonte.
  # Uso: EMAIL=... PASSWORD=... UNTIL=2050-12-31 [NAME=...] [ADMIN=1] bin/rails gbm:liberar
  desc "Cria ou atualiza uma conta com acesso liberado até UNTIL"
  task liberar: :environment do
    email = ENV.fetch("EMAIL")
    account = Account.find_or_initialize_by(email: email.strip.downcase)
    account.name = ENV["NAME"] if ENV["NAME"]
    account.password = ENV["PASSWORD"] if ENV["PASSWORD"]
    account.terms_accepted_at ||= Time.current
    account.admin = true if ENV["ADMIN"] == "1"
    account.assign_attributes(access_status: "liberado", access_from: Time.current,
                              access_until: Time.zone.parse(ENV.fetch("UNTIL")).end_of_day)
    account.save!
    puts "#{account.email}: liberado de #{account.access_from} até #{account.access_until}"
  end
end
