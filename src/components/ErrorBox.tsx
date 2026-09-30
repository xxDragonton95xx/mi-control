export default function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{message}</p>
}
