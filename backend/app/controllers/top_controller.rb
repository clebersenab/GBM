# Top 10 do GBM: livros que mais crianças diferentes começaram ou terminaram nos últimos 30 dias.
class TopController < ApplicationController
  WINDOW = 30.days

  # GET /titles/top
  def index
    since = WINDOW.ago
    readers = "COUNT(DISTINCT reading_entries.child_profile_id)"
    rows = ReadingEntry.joins(:title)
                       .where(status: %w[lendo lido])
                       .where("COALESCE(reading_entries.started_at, reading_entries.updated_at) >= ?", since)
                       .group("titles.slug")
                       .order(Arel.sql("#{readers} DESC, MAX(reading_entries.updated_at) DESC"))
                       .limit(10)
                       .pluck("titles.slug", Arel.sql(readers))
    render json: { days: WINDOW.in_days.to_i, items: rows.map { |slug, n| { slug: slug, readers: n } } }
  end
end
