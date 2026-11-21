module Admin
  class ActivationCodesController < ApplicationController
    before_action :require_admin

    # POST /admin/activation_codes { months, store, quantity, expires_at? }
    def create
      quantity = params.fetch(:quantity, 1).to_i.clamp(1, 500)
      codes = ActivationCode.transaction do
        Array.new(quantity) do
          ActivationCode.create!(months: params.require(:months), store: params[:store], expires_at: params[:expires_at])
        end
      end
      render json: codes.map { |c| c.slice(:code, :months, :store, :expires_at) }, status: :created
    end
  end
end
