# Conteúdo do leitor: páginas, perguntas para o adulto, vocabulário e quiz.
# Cada livro mora em content/livros/<slug>.json. Um livro marcado como "amostra"
# serve para testar o leitor e abre para qualquer conta logada.
class BookContent
  DIR = Rails.root.join("content", "livros")
  SLUG = /\A[a-z0-9][a-z0-9-]*\z/

  def self.find(slug)
    return nil unless slug.to_s.match?(SLUG)
    path = DIR.join("#{slug}.json")
    return nil unless path.file?
    JSON.parse(path.read)
  end
end
