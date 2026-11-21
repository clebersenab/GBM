ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

class ActiveSupport::TestCase
  parallelize(workers: 1)
end

class ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  # Faz o fluxo real de login: pede o código, lê o e-mail e confirma.
  def login(email = "pai@exemplo.com")
    perform_enqueued_jobs { post "/auth/code", params: { email: email } }
    code = ActionMailer::Base.deliveries.last.body.to_s[/\b(\d{6})\b/, 1]
    post "/auth/verify", params: { email: email, code: code }
    assert_response :created
    @token = response.parsed_body["token"]
    Account.find_by!(email: email)
  end

  def auth = { "Authorization" => "Bearer #{@token}" }

  def set_pin(pin = "1234")
    post "/parent/pin", params: { pin: pin }, headers: auth
    assert_response :no_content
  end

  def activate!(account, until_at: 1.month.from_now)
    Subscription.create!(account: account, plan: "mensal", status: "active", source: "admin", current_period_end: until_at)
  end

  def title(slug = "moby-dick") = Title.find_or_create_by!(slug: slug) { |t| t.title = slug.titleize }
end
