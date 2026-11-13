import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { parentApi } from "@/services/parentApi"

export function useChildren() {
  const { data: children = [], isLoading } = useQuery({
    queryKey: ["children"],
    queryFn: () => parentApi.getChildren(), // ← без аргументов
  })

  return { children, isLoading }
}

export function useFamilyMembers() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["family-members"],
    queryFn: () => parentApi.getFamilyMembers(),
  })

  const children = data.filter((u: any) => u.role === "CHILD")
  const parents = data.filter((u: any) => u.role === "PARENT")

  return { members: data, children, parents, isLoading }
}
