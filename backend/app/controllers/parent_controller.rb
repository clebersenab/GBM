# PIN dos pais: protege perfis, plano e compras das mãos das crianças.
class ParentController < ApplicationController
  rate_limit to: 5, within: 5.minutes, only: :unlock, by: -> { current_session&.id || request.remote_ip },
             with: -> { render json: { error: "muitas tentativas, aguarde" }, status: :too_many_requests }

  # POST /parent/pin { pin, current_pin? }
  # Primeira vez: só nos 10 minutos após o login. Troca: exige o PIN atual.
  def set_pin
    account = current_account
    if account.pin_set?
      return render(json: { error: "PIN atual incorreto" }, status: :forbidden) unless account.authenticate_pin(params[:current_pin].to_s)
    elsif current_session.created_at < Session::PARENT_WINDOW.ago
      return render(json: { error: "entre de novo para criar o PIN" }, status: :forbidden)
    end
    account.update!(pin: params.require(:pin).to_s)
    current_session.unlock_parent!
    head :no_content
  end

  # POST /parent/unlock { pin } -> libera ações de adulto por 10 minutos
  def unlock
    unless current_account.pin_set? && current_account.authenticate_pin(params.require(:pin).to_s)
      return render(json: { error: "PIN incorreto" }, status: :forbidden)
    end
    current_session.unlock_parent!
    render json: { parent_unlocked_until: current_session.parent_unlocked_until }
  end

  # POST /parent/lock
  def lock
    current_session.lock_parent!
    head :no_content
  end
end
