class MeController < ApplicationController
  def self.payload(account, session)
    {
      email: account.email,
      name: account.name,
      pin_set: account.pin_set?,
      parent_unlocked: session.parent_unlocked?,
      profiles: account.child_profiles.order(:created_at).map { |p| p.slice(:id, :name, :avatar, :age_band) },
      access: account.access_summary,
      theme: account.theme || "dark"
    }
  end

  # GET /me
  def show = render(json: self.class.payload(current_account, current_session))

  # PATCH /me/preferences  { theme: "dark" | "light" }
  def preferences
    theme = params[:theme].to_s
    return render(json: { error: "Tema inválido." }, status: :unprocessable_entity) unless Account::THEMES.include?(theme)

    current_account.update!(theme: theme)
    render json: self.class.payload(current_account, current_session)
  end
end
