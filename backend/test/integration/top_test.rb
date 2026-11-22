require "test_helper"

class TopTest < ActionDispatch::IntegrationTest
  test "top 10 conta crianças diferentes que leram nos últimos 30 dias" do
    a = login("a@exemplo.com")
    k1, k2 = a.child_profiles.create!(name: "Um"), a.child_profiles.create!(name: "Dois")
    moby, hamlet, velho = title("moby-dick"), title("hamlet"), title("iracema")
    [k1, k2].each { |k| k.reading_entries.create!(title: moby, status: "lido") }
    k1.reading_entries.create!(title: hamlet, status: "lendo")
    k2.reading_entries.create!(title: hamlet, status: "quero_ler") # só interesse não conta
    k1.reading_entries.create!(title: velho, status: "lido", started_at: 40.days.ago, updated_at: 40.days.ago)

    get "/titles/top", headers: auth
    assert_response :ok
    items = response.parsed_body["items"]
    assert_equal [["moby-dick", 2], ["hamlet", 1]], items.map { |i| [i["slug"], i["readers"]] }
  end
end
