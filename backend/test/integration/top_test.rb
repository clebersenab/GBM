require "test_helper"

class TopTest < ActionDispatch::IntegrationTest
  test "top 10 conta crianças diferentes que leram nos últimos 30 dias; empate pela ordem de cadastro" do
    a = login("a@exemplo.com")
    k1, k2 = a.child_profiles.create!(name: "Um"), a.child_profiles.create!(name: "Dois")
    primeiro = title("primeiro-cadastrado")
    moby, hamlet, velho = title("moby-dick"), title("hamlet"), title("iracema")
    (1..8).each { |i| title("extra-#{i}") }
    [k1, k2].each { |k| k.reading_entries.create!(title: moby, status: "lido") }
    k1.reading_entries.create!(title: hamlet, status: "lendo")
    k2.reading_entries.create!(title: hamlet, status: "quero_ler") # só interesse não conta
    k1.reading_entries.create!(title: velho, status: "lido", started_at: 40.days.ago, updated_at: 40.days.ago)

    get "/titles/top", headers: auth
    items = response.parsed_body["items"]
    assert_equal 10, items.size
    assert_equal [["moby-dick", 2], ["hamlet", 1], ["primeiro-cadastrado", 0]], items.first(3).map { |i| [i["slug"], i["readers"]] }
  end
end
