ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

class ActiveSupport::TestCase
  parallelize(workers: 1)
end

class ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  # Cadastro real pela API; devolve a conta.
  def login(email = "pai@exemplo.com", password: "senha-segura")
    post "/auth/signup", params: { name: "Responsável", email: email, password: password, accept_terms: true }
    assert_response :created
    @token = response.parsed_body["token"]
    Account.find_by!(email: email)
  end

  def auth = { "Authorization" => "Bearer #{@token}" }

  def activate!(account, until_at: 1.month.from_now)
    Subscription.create!(account: account, plan: "mensal", status: "active", source: "admin", current_period_end: until_at)
  end

  def title(slug = "moby-dick") = Title.find_or_create_by!(slug: slug) { |t| t.title = slug.titleize }
end
