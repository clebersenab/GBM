# Gerenciar assinatura. Sem gateway ainda: "próxima cobrança" é o fim do período vigente.
# Cancelar = não renovar. O acesso segue até o fim do período; os PDFs baixados continuam da família.
class SubscriptionController < ApplicationController
  PRICES = { "mensal" => 19.90 }.freeze

  # GET /me/subscription
  def show = render(json: summary)

  # POST /me/subscription/cancel { nps_score, reason, comment }
  def cancel
    return render(json: { error: "A renovação já está cancelada." }, status: :unprocessable_entity) if current_account.renewal_canceled?
    return render(json: { error: "Não há assinatura ou acesso para cancelar." }, status: :unprocessable_entity) unless current_account.full_access?

    Account.transaction do
      current_account.cancellations.create!(nps_score: params.require(:nps_score).to_i,
                                            reason: params[:reason].presence, comment: params[:comment].presence)
      current_account.update!(renewal_canceled_at: Time.current)
    end
    render json: summary
  end

  # POST /me/subscription/resume -> desiste do cancelamento enquanto o período vale
  def resume
    return render(json: { error: "O período já terminou." }, status: :unprocessable_entity) unless current_account.full_access?

    current_account.cancellations.where(reverted_at: nil).update_all(reverted_at: Time.current)
    current_account.update!(renewal_canceled_at: nil)
    render json: summary
  end

  private

  def summary
    a = current_account
    sub = a.subscription
    access = a.access_summary
    period_end = case access[:reason]
                 when "liberado" then a.access_until
                 when "assinatura" then sub.current_period_end
                 end
    charges = access[:reason] == "assinatura" && sub.source == "gateway"
    {
      kind: access[:reason], # liberado | assinatura | sem_acesso | bloqueado
      plan: sub&.plan,
      price: sub && PRICES[sub.plan],
      period_end: period_end,
      next_charge_at: (period_end if charges && !a.renewal_canceled?),
      renewal_canceled_at: a.renewal_canceled_at,
      downloads: a.downloads.count,
      reasons: Cancellation::REASONS
    }
  end
end
