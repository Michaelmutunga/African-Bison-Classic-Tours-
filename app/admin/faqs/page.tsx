import { DeleteFaq, FaqForm } from "@/components/admin/content-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { listFaqs } from "@/server/content-admin";
import { currentUser } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function FaqsPage() {
  const user = await currentUser();
  if (!user) throw new UnauthorizedError();
  if (!hasPermission(user.role, "catalogue.write")) throw new ForbiddenError("catalogue.write");
  const faqs = await listFaqs(false);
  return (
    <div className="grid max-w-3xl gap-4">
      <h2 className="type-h3">FAQs ({faqs.length})</h2>
      {faqs.map((faq) => (
        <Card key={faq.id}>
          <CardBody>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="type-small font-semibold">{faq.question}</p>
              <Badge tone={faq.published ? "earth" : "neutral"}>
                {faq.published ? `Published · #${faq.order}` : "Hidden"}
              </Badge>
            </div>
            <p className="type-small mt-1 text-ink/70">{faq.answer}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              <details>
                <summary className="type-caption cursor-pointer underline underline-offset-4">Edit</summary>
                <div className="mt-2">
                  <FaqForm initial={{ id: faq.id, question: faq.question, answer: faq.answer, order: faq.order, published: faq.published }} />
                </div>
              </details>
              <DeleteFaq id={faq.id} question={faq.question} />
            </div>
          </CardBody>
        </Card>
      ))}
      <Card>
        <CardBody>
          <h3 className="type-h3">New FAQ</h3>
          <div className="mt-2">
            <FaqForm />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
