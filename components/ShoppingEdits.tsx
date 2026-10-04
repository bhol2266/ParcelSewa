import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { shoppingEdits } from "@/lib/storefront";

export default function ShoppingEdits() {
  return (
    <div className="shopping-edits">
      {shoppingEdits.map((edit, index) => {
        return (
          <article key={edit.title} className={`shopping-edit shopping-edit-${index}`}>
            <div className="edit-visual"><img src={edit.image} alt={edit.alt} width={1200} height={800} loading="lazy" decoding="async" /><span>0{index + 1}</span></div>
            <div className="edit-copy">
              <p className="eyebrow">{edit.category}</p>
              <h3>{edit.title}</h3>
              <p>{edit.description}</p>
              <a href={edit.url} target="_blank" rel="noopener noreferrer">{edit.store}<ArrowUpRightIcon className="size-4" aria-hidden="true" /><span className="sr-only"> (opens a new tab)</span></a>
            </div>
          </article>
        );
      })}
    </div>
  );
}
