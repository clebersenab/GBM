# Leituras ao mesmo tempo (modelo das telas da Netflix).
# O leitor avisa a cada minuto que está lendo; sem aviso por READING_TTL, a vaga se libera.
# Com as vagas ocupadas, o aparelho recebe 409 com a lista de quem está lendo e pode assumir uma vaga.
class ReadingController < ApplicationController
  # POST /reading { slug } -> pega ou renova a vaga deste aparelho
  def claim
    current_account.with_lock { reserve! }
  end

  # POST /reading/takeover { session_id, slug } -> encerra a leitura em outro aparelho e lê aqui
  def takeover
    current_account.with_lock do
      other = current_account.sessions.find(params[:session_id])
      other.update!(reading_until: nil, reading_kicked_at: Time.current) unless other.id == current_session.id
      reserve!
    end
  end

  # DELETE /reading -> fechou o livro
  def release
    current_session.update!(reading_until: nil)
    head :no_content
  end

  private

  def reserve!
    s = current_session.reload
    others = current_account.sessions.live.where.not(id: s.id).where("reading_until > ?", Time.current)
    if !s.reading? && others.count >= Session::MAX_READINGS
      kicked = s.reading_kicked_at.present? && s.reading_kicked_at > 30.minutes.ago
      return render(json: { error: "Já tem #{Session::MAX_READINGS} leituras acontecendo agora nesta conta.",
                            code: kicked ? "assumida" : "lotado", outros: others.map(&:view) }, status: :conflict)
    end
    s.update!(reading_until: Session::READING_TTL.from_now, reading_slug: params[:slug].to_s.first(120), reading_kicked_at: nil)
    render json: { ok: true, ate: s.reading_until }
  end
end
