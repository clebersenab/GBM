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

  # Usada na inicialização do servidor: só age se LIBERAR_EMAIL estiver definido no painel.
  desc "Cria a conta liberada definida por LIBERAR_EMAIL, LIBERAR_PASSWORD e LIBERAR_UNTIL"
  task liberar_from_env: :environment do
    next if ENV["LIBERAR_EMAIL"].blank?
    ENV["EMAIL"] = ENV["LIBERAR_EMAIL"]
    ENV["PASSWORD"] = ENV["LIBERAR_PASSWORD"]
    ENV["UNTIL"] = ENV.fetch("LIBERAR_UNTIL", "2050-12-31")
    ENV["NAME"] = ENV["LIBERAR_NAME"]
    ENV["ADMIN"] = ENV["LIBERAR_ADMIN"]
    Rake::Task["gbm:liberar"].invoke
  end

  # Usada na inicialização do servidor: garante que as contas listadas sejam admin.
  # Só promove contas que já existem; nunca tira o acesso de ninguém.
  desc "Marca como admin as contas de ADMIN_EMAILS (padrão: o dono do GBM)"
  task admins: :environment do
    emails = ENV.fetch("ADMIN_EMAILS", "cleber.senab@gmail.com").split(",").map { |e| e.strip.downcase }.reject(&:empty?)
    Account.where(email: emails, admin: false).find_each do |a|
      a.update!(admin: true)
      puts "#{a.email}: agora é admin"
    end
  end
end
