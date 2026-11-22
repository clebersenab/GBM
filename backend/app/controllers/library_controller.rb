# Estante de cada criança: o que quer ler, está lendo e já leu; e os sinais de interesse.
class LibraryController < ApplicationController
  before_action :load_profile

  # GET /profiles/:profile_id/library
  def index
    render json: @profile.reading_entries.includes(:title).order(updated_at: :desc).map(&:view)
  end

  # PUT /profiles/:profile_id/library/:slug { status, liked? }
  def upsert
    title = Title.find_by!(slug: params[:slug])
    entry = @profile.reading_entries.find_or_initialize_by(title: title)
    entry.status = params[:status] if params.key?(:status)
    entry.liked = ActiveModel::Type::Boolean.new.cast(params[:liked]) if params.key?(:liked)
    entry.status ||= "quero_ler"
    entry.save!
    render json: entry.view
  end

  # DELETE /profiles/:profile_id/library/:slug
  def destroy
    title = Title.find_by!(slug: params[:slug])
    @profile.reading_entries.where(title: title).destroy_all
    head :no_content
  end

  # GET /profiles/:profile_id/signals
  def signals
    render json: @profile.profile_signals.map { |s| s.slice(:kind, :key, :count, :last_at) }
  end

  # POST /profiles/:profile_id/signals { kind, key }
  def signal
    s = ProfileSignal.bump!(@profile, params.require(:kind), params.require(:key))
    render json: s.slice(:kind, :key, :count, :last_at)
  end

  private

  def load_profile = @profile = current_account.child_profiles.find(params[:profile_id])
end
