# Entrega o PDF por um link assinado de curta duração.
# O armazenamento definitivo (S3 ou similar) e o nome do comprador no PDF entram depois.
class FilesController < ApplicationController
  allow_anonymous only: :show
  LINK_TTL = 5.minutes

  def self.verifier = Rails.application.message_verifier("gbm-pdf")

  def show
    data = self.class.verifier.verified(params[:token])
    return render(json: { error: "link expirado" }, status: :gone) unless data
    title = Title.find(data["t"])
    path = title.pdf_path.present? && Rails.root.join("storage", "pdfs", File.basename(title.pdf_path))
    return render(json: { error: "PDF ainda não disponível" }, status: :not_found) unless path && File.exist?(path)
    send_file path, type: "application/pdf", filename: "#{title.slug}.pdf"
  end
end
