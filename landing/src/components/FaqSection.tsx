import { Plus } from "lucide-react";
import { faqs } from "../lib/content";
export function FaqSection() {
  return (
    <section
      className="section container faq-section"
      id="faq"
      aria-labelledby="faq-title"
    >
      <div className="faq-heading">
        <p className="eyebrow">ANTES DE ELEGIR TU PLAN</p>
        <h2 id="faq-title">
          ¿Costo360 es
          <br />
          <span>para tu taller?</span>
        </h2>
        <p>
          Conoce qué puedes hacer, cuánto cuesta y cómo te ayuda en el día a día.
        </p>
        <img
          className="faq-cost-image"
          src="/media/editorial/cost-faq-wave.webp"
          alt="Cost te saluda y te invita a conocer cómo puede ayudarte Costo360."
          width={660}
          height={880}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="faq-list">
        {faqs.map((faq, index) => (
          <details
            key={faq.question}
            name="faq"
            open={index === 0 ? true : undefined}
          >
            <summary>
              <h3>{faq.question}</h3>
              <Plus size={19} />
            </summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
