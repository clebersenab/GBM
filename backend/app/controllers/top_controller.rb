# Top 10 do GBM: livros que mais crianças diferentes começaram ou terminaram nos últimos 30 dias.
# Sempre devolve 10: no empate (inclusive todos com zero), vem primeiro o título cadastrado antes (posição no catálogo).
class TopController < ApplicationController
  WINDOW = 30.days

  # GET /titles/top
  def index
    since = Title.connection.quote(WINDOW.ago)
    readers = "COUNT(DISTINCT reading_entries.child_profile_id)"
    rows = Title.visible.joins(<<~SQL.squish)
      LEFT JOIN reading_entries ON reading_entries.title_id = titles.id
        AND reading_entries.status IN ('lendo', 'lido')
        AND COALESCE(reading_entries.started_at, reading_entries.updated_at) >= #{since}
    SQL
      .group("titles.id", "titles.slug")
      .order(Arel.sql("#{readers} DESC, titles.position ASC, titles.id ASC"))
      .limit(10)
      .pluck("titles.slug", Arel.sql(readers))
    render json: { days: WINDOW.in_days.to_i, items: rows.map { |slug, n| { slug: slug, readers: n } } }
  end
end
