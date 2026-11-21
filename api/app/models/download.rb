# Registro de posse: o PDF que a família baixou é dela, mesmo depois de cancelar.
class Download < ApplicationRecord
  belongs_to :account
  belongs_to :title

  def self.record!(account, title)
    now = Time.current
    d = find_or_initialize_by(account: account, title: title)
    if d.new_record?
      d.assign_attributes(first_downloaded_at: now, last_downloaded_at: now, count: 1)
    else
      d.assign_attributes(last_downloaded_at: now, count: d.count + 1)
    end
    d.save!
    d
  end
end
