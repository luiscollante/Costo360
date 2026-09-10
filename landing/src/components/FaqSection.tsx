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
        <p className="eyebrow">SIN LETRA PEQUEÑA</p>
        <h2 id="faq-title">
          Buenas preguntas.
          <br />
          <span>Respuestas claras.</span>
        </h2>
        <p>
          Lo que necesitas saber antes
          <br />
          de dar el siguiente paso.
        </p>
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
