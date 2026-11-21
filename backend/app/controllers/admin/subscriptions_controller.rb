# Sem gateway: o admin ativa, estende ou cancela a assinatura manualmente.
module Admin
  class SubscriptionsController < ApplicationController
    before_action :require_admin

    # PUT /admin/accounts/:account_id/subscription { plan, status, current_period_end }
    def update
      account = Account.find(params[:account_id])
      sub = account.subscription || account.build_subscription
      attrs = params.permit(:plan, :status, :current_period_end).to_h
      attrs[:canceled_at] = attrs[:status] == "canceled" ? Time.current : nil if attrs.key?(:status)
      sub.update!(attrs.merge(source: "admin"))
      render json: { plan: sub.plan, status: sub.status, active: sub.active?, current_period_end: sub.current_period_end }
    end
  end
end
