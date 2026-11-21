class MeController < ApplicationController
  def self.payload(account, session)
    sub = account.subscription
    {
      email: account.email,
      name: account.name,
      pin_set: account.pin_set?,
      parent_unlocked: session.parent_unlocked?,
      profiles: account.child_profiles.order(:created_at).map { |p| p.slice(:id, :name, :avatar, :age_band) },
      subscription: sub && { plan: sub.plan, status: sub.status, active: sub.active?, current_period_end: sub.current_period_end }
    }
  end

  # GET /me
  def show = render(json: self.class.payload(current_account, current_session))
end
