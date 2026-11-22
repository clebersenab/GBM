class ReadingEntry < ApplicationRecord
  STATUSES = %w[quero_ler lendo lido].freeze

  belongs_to :child_profile
  belongs_to :title

  validates :status, inclusion: { in: STATUSES }
  before_save :stamp_dates

  def view = { slug: title.slug, status: status, liked: liked, started_at: started_at,
               finished_at: finished_at, updated_at: updated_at }

  private

  def stamp_dates
    self.started_at ||= Time.current if status.in?(%w[lendo lido])
    self.finished_at = status == "lido" ? (finished_at || Time.current) : nil
  end
end
