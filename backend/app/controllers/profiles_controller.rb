class ProfilesController < ApplicationController
  def index = render(json: current_account.child_profiles.order(:created_at).map(&:view))

  def create
    profile = current_account.child_profiles.create!(profile_params)
    render json: profile.view, status: :created
  end

  def update
    profile = current_account.child_profiles.find(params[:id])
    profile.update!(profile_params)
    render json: profile.view
  end

  def destroy
    current_account.child_profiles.find(params[:id]).destroy!
    head :no_content
  end

  private

  def profile_params
    p = params.require(:profile).permit(:name, :avatar, :age_band, focus_valores: [], focus_caminhos: [])
    %i[focus_valores focus_caminhos].each { |k| p[k] = Array(p[k]).compact_blank.uniq if p.key?(k) }
    p
  end
end
