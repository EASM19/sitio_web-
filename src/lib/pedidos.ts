export const MAX_NUM_PEDIDO_VALIDO = 100000;

export function esPedidoValido(numeroPedido: number | null | undefined): boolean {
  return typeof numeroPedido === "number" && numeroPedido > 0 && numeroPedido < MAX_NUM_PEDIDO_VALIDO;
}
