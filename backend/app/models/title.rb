# Uma história do catálogo. O cadastro passa por:
#   rascunho (admin cria) -> em_edicao (editor completa quiz e páginas) -> em_revisao -> publicado (admin)
class Title < ApplicationRecord
  STATUSES = %w[rascunho em_edicao em_revisao publicado].freeze
  TIPOS_OBRA = %w[livro filme serie].freeze

  has_many :downloads, dependent: :restrict_with_error
  has_many :reading_entries, dependent: :restrict_with_error
  has_many :pages, -> { order(:position) }, class_name: "BookPage", dependent: :destroy
  belongs_to :editor, class_name: "Account", optional: true
  belongs_to :cover_image, class_name: "StoredImage", optional: true

  scope :published, -> { where(status: "publicado") }
  # O que aparece no catálogo: publicados + "em breve" (visíveis, mas sem leitura).
  scope :visible, -> { where(status: "publicado").or(where(em_breve: true)) }

  validates :slug, :title, presence: true
  validates :slug, uniqueness: true, format: { with: /\A[a-z0-9][a-z0-9-]*\z/, message: "só pode ter letras minúsculas, números e hífen" }
  validates :status, inclusion: { in: STATUSES }
  validate :quiz_shape, :vocabulario_shape

  before_create { self.position ||= (Title.maximum(:position) || 0) + 1 }

  def to_param = slug
  def published? = status == "publicado"
  def capa_url(base) = cover_image ? cover_image.url(base) : capa_path.presence

  # Mesmo formato do antigo data/catalogo.json, para a plataforma.
  def catalog_view(base)
    { id: slug, titulo: title, sinopse: sinopse.to_s, obra_mae: obra_mae.presence, valores: valores, caminhos: caminhos,
      volume: volume, fileiras: fileiras, vitrine: vitrine, capa: capa_url(base), lancamento: lancamento,
      box: box.presence, colecoes: colecoes, em_breve: !published? }
  end

  # Conteúdo do leitor. paginas = nil enquanto a história não tem páginas.
  def reader_view(base, amostra: false)
    list = pages.includes(:image).map { |p| { imagem: p.image_url(base), texto: p.text, pergunta: p.parent_question.presence } }
    { slug: slug, titulo: title, capa: capa_url(base), amostra: amostra, paginas: list.presence,
      vocabulario: vocabulario, quiz: quiz, quando_crescer: obra_mae.presence }
  end

  def admin_view(base)
    catalog_view(base).merge(
      db_id: id, status: status, mostrar_em_breve: em_breve, editor: editor && { id: editor.id, email: editor.email, name: editor.name },
      review_note: review_note, quiz: quiz, vocabulario: vocabulario, published_at: published_at, updated_at: updated_at,
      cover_image_id: cover_image_id,
      pages: pages.includes(:image).map { |p| { image_id: p.image_id, image_path: p.image_path, image_url: p.image_url(base), text: p.text, parent_question: p.parent_question } }
    )
  end

  # O que falta para cada passo do fluxo (lista vazia = pode seguir).
  def missing_for_review
    m = []
    m << "pelo menos uma página" if pages.empty?
    pages.each_with_index do |p, i|
      m << "imagem da página #{i + 1}" unless p.image_id || p.image_path.present?
      m << "texto da página #{i + 1}" if p.text.blank?
    end
    m
  end

  def missing_for_publish
    m = []
    m << "sinopse" if sinopse.blank?
    m << "capa" unless cover_image_id || capa_path.present?
    m
  end

  private

  def quiz_shape
    return errors.add(:quiz, "precisa ser uma lista") unless quiz.is_a?(Array)
    quiz.each_with_index do |q, i|
      ok = q.is_a?(Hash) && q["pergunta"].present? && q["opcoes"].is_a?(Array) && q["opcoes"].size.between?(2, 4) &&
           q["opcoes"].all?(&:present?) && q["certa"].is_a?(Integer) && q["certa"].between?(0, q["opcoes"].size - 1)
      errors.add(:quiz, "pergunta #{i + 1} precisa de enunciado, de 2 a 4 opções preenchidas e a resposta certa") unless ok
    end
  end

  def vocabulario_shape
    return errors.add(:vocabulario, "precisa ser uma lista") unless vocabulario.is_a?(Array)
    errors.add(:vocabulario, "pode ter no máximo 4 palavras") if vocabulario.size > 4
    vocabulario.each_with_index do |v, i|
      errors.add(:vocabulario, "palavra #{i + 1} precisa de palavra e significado") unless v.is_a?(Hash) && v["palavra"].present? && v["significado"].present?
    end
  end
end
