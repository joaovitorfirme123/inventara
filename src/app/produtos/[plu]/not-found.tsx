import Link from "next/link";

export default function ProductNotFound() {
  return (
    <section className="product-not-found panel">
      <span>404</span>
      <div>
        <h1>Produto não encontrado</h1>
        <p>O PLU não existe ou não pertence à organização atual.</p>
        <Link href="/produtos">Voltar para produtos</Link>
      </div>
    </section>
  );
}
