# Liberação manual de acesso, independente de pagamento.
module Admin
  class AccessController < ApplicationController
    before_action :require_admin

    # PUT /admin/accounts/:account_id/access { status: liberado|cadastrado|bloqueado, from, until }
    def update
      account = Account.find(params[:account_id])
      status = params.require(:status)
      attrs = { access_status: status }
      attrs.merge!(access_from: params[:from].presence || Time.current, access_until: params[:until]) if status == "liberado"
      account.update!(attrs)
      render json: account.access_summary
    end
  end
end
