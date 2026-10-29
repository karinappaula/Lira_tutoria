'use client';

import { CheckCircle2, Edit2, Tag } from 'lucide-react';
import { Badge, type TomDoBadge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Modal } from '@/components/ui/Modal/Modal';
import { RenderizadorQuestao } from '@/components/questoes/RenderizadorQuestao';
import type { Questao } from '@/types/simulados';

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  questao: Questao | null;
  aoEditar: (questao: Questao) => void;
}

function tomDificuldade(dif: string): TomDoBadge {
  switch (dif?.toUpperCase()) {
    case 'FACIL':
      return 'sucesso';
    case 'MEDIA':
      return 'alerta';
    case 'DIFICIL':
      return 'perigo';
    default:
      return 'neutro';
  }
}

export function ModalDetalheQuestao({ aberto, aoFechar, questao, aoEditar }: Props) {
  if (!questao) return null;

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={`Visualização da Questão #${questao.id}`}
      tamanho="lg"
      rodape={
        <>
          <Button
            variante="secundario"
            icone={<Edit2 size={16} aria-hidden="true" />}
            onClick={() => {
              aoFechar();
              aoEditar(questao);
            }}
          >
            Editar Questão
          </Button>
          <Button onClick={aoFechar}>Fechar</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Metadados */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <Badge tom="sucesso">{questao.vestibular}</Badge>
          <Badge tom="neutro">Ano: {questao.ano}</Badge>
          {questao.numeroQuestao && <Badge tom="neutro">Questão {questao.numeroQuestao}</Badge>}
          <Badge tom={tomDificuldade(questao.grauDificuldade)}>Dificuldade: {questao.grauDificuldade}</Badge>
          <Badge tom={questao.status === 'ATIVA' ? 'sucesso' : 'alerta'}>
            Status: {questao.status === 'ATIVA' ? 'Ativa' : 'Inativa'}
          </Badge>
        </div>

        {/* Assuntos */}
        {questao.assuntos && questao.assuntos.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#6b7d80', fontWeight: 500 }}>Assuntos:</span>
            {questao.assuntos.map((v, i) => {
              const nome =
                'assunto' in v && v.assunto
                  ? v.assunto.nomeAssunto
                  : 'nomeAssunto' in v
                    ? String(v.nomeAssunto)
                    : '';
              return (
                <span
                  key={i}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: '#e5f3f1',
                    color: '#006b70',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                  }}
                >
                  <Tag size={12} aria-hidden="true" />
                  {nome}
                </span>
              );
            })}
          </div>
        )}

        {/* Enunciado Formatado com Markdown, Texto Base e [IMAGEM] In-line */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #dce6e4',
          }}
        >
          <RenderizadorQuestao conteudo={questao.enunciado} imagemUrl={questao.imagemUrl} />
        </div>

        {/* Alternativas */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#17292d', marginBottom: '12px' }}>Alternativas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {questao.alternativas?.map((alt) => {
              const correta = alt.alternativaCorreta === true;
              return (
                <div
                  key={alt.letraOpcao}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: correta ? '#e5f3f1' : '#ffffff',
                    border: `1px solid ${correta ? '#006b70' : '#dce6e4'}`,
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '999px',
                      background: correta ? '#006b70' : '#eaf0ef',
                      color: correta ? '#ffffff' : '#17292d',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      flexShrink: 0,
                    }}
                  >
                    {alt.letraOpcao}
                  </span>
                  <div style={{ flex: 1, fontSize: '0.92rem', color: '#17292d', paddingTop: '3px' }}>
                    {alt.textoAlternativa}
                  </div>
                  {correta && (
                    <Badge tom="sucesso">
                      <CheckCircle2 size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
                      Gabarito Correto
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Explicação do Gabarito */}
        {questao.explicacaoGabarito && (
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: '#f3f7f6',
              border: '1px solid #c2d1ce',
            }}
          >
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#006b70', marginBottom: '6px' }}>
              Resolução Comentada / Explicação:
            </h4>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5, color: '#17292d', whiteSpace: 'pre-wrap' }}>
              {questao.explicacaoGabarito}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
