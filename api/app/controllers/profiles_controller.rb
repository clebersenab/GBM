class ProfilesController < ApplicationController
  before_action :require_parent, except: :index

  def index = render(json: current_account.child_profiles.order(:created_at).map { |p| view(p) })

  def create
    profile = current_account.child_profiles.create!(profile_params)
    render json: view(profile), status: :created
  end

  def update
    profile = current_account.child_profiles.find(params[:id])
    profile.update!(profile_params)
    render json: view(profile)
  end

  def destroy
    current_account.child_profiles.find(params[:id]).destroy!
    head :no_content
  end

  private

  def profile_params = params.require(:profile).permit(:name, :avatar, :age_band)
  def view(p) = p.slice(:id, :name, :avatar, :age_band)
end
