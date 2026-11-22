class ActivationCodesController < ApplicationController
  rate_limit to: 10, within: 10.minutes, only: :redeem, by: -> { current_session&.id || request.remote_ip },
             with: -> { render json: { error: "muitas tentativas" }, status: :too_many_requests }

  # POST /codes/redeem { code }
  def redeem
    code = ActivationCode.find_by(code: ActivationCode.normalize(params.require(:code)))
    return render(json: { error: "código não encontrado" }, status: :not_found) unless code
    error = code.redeem!(current_account)
    return render(json: { error: error }, status: :unprocessable_entity) if error
    sub = current_account.reload.subscription
    render json: { plan: sub.plan, active: sub.active?, current_period_end: sub.current_period_end }
  end
end
