class ReadingEntry < ApplicationRecord
  STATUSES = %w[quero_ler lendo lido].freeze

  belongs_to :child_profile
  belongs_to :title

  validates :status, inclusion: { in: STATUSES }
  validates :page, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :diary, length: { maximum: 2000 }
  before_save :stamp_dates

  def view = { slug: title.slug, status: status, liked: liked, started_at: started_at,
               finished_at: finished_at, updated_at: updated_at, page: page, pages_total: pages_total,
               quiz_score: quiz_score, quiz_total: quiz_total, diary: diary }

  private

  def stamp_dates
    self.started_at ||= Time.current if status.in?(%w[lendo lido])
    self.finished_at = status == "lido" ? (finished_at || Time.current) : nil
  end
end
