import { AppShell } from "@/components/dashboard/app-shell"
import { PetaCisadaneLayoutEditor } from "@/components/dashboard/peta-cisadane-layout-editor"
import { getPetaCisadaneLayoutDocument } from "@/lib/peta-cisadane-layout"

export const dynamic = "force-dynamic"

export default async function EditPetaJaringanPage() {
  const document = await getPetaCisadaneLayoutDocument()

  return (
    <AppShell activePath="/peta-jaringan" title="Edit Layout Peta" contentPadding={false}>
      <div className="flex flex-col gap-4 px-4 py-4 lg:px-6">
        <PetaCisadaneLayoutEditor initialDocument={document} />
      </div>
    </AppShell>
  )
}
