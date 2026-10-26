import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { parentApi } from "@/services/parentApi"

export function useChildren() {
  const queryClient = useQueryClient()

  // Запрос с автоматическим кешированием
  const { data: children = [], isLoading } = useQuery({
    queryKey: ["children"],
    queryFn: () => parentApi.getChildren(process.env.NEXT_PUBLIC_PARENT_TELEGRAM_ID),
  })

  // Мутация с авто-обновлением кеша
  const createChildMutation = useMutation({
    mutationFn: parentApi.createChild,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["children"] })
    },
  })

  return {
    children,
    isLoading,
    createChild: createChildMutation.mutate,
  }
}
