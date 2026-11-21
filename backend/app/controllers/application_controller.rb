class ApplicationController < ActionController::API
  include Authentication

  rescue_from ActiveRecord::RecordNotFound do
    render json: { error: "não encontrado" }, status: :not_found
  end

  rescue_from ActiveRecord::RecordInvalid do |e|
    render json: { error: e.record.errors.full_messages.to_sentence }, status: :unprocessable_entity
  end
end
