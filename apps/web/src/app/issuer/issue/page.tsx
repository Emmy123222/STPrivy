'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FilePlus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useIssueCredential } from '@/hooks/use-credentials';

const CREDENTIAL_TYPES = [
  { value: 'AgeCredential', label: 'Age Credential' },
  { value: 'ResidencyCredential', label: 'Residency Credential' },
  { value: 'AccreditedInvestorCredential', label: 'Accredited Investor Credential' },
  { value: 'SanctionsCredential', label: 'Sanctions Clearance Credential' },
];

const schema = z.object({
  subjectDID: z.string().min(10, 'Enter the subject DID'),
  type: z.string().min(1, 'Select a credential type'),
  country: z.string().optional(),
  age: z.coerce.number().min(0).max(200).optional(),
  accredited: z.boolean().optional(),
  expiresAt: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function IssueCredentialPage() {
  const issue = useIssueCredential();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'AgeCredential' },
  });

  const selectedType = watch('type');

  const onSubmit = (values: FormValues) => {
    const claims: Record<string, unknown> = {};
    if (values.country) claims.country = values.country;
    if (values.age !== undefined) claims.age = values.age;
    if (values.accredited !== undefined) claims.accredited = values.accredited;

    issue.mutate({
      subjectDID: values.subjectDID,
      type: [values.type, 'VerifiableCredential'],
      claims,
      expiresAt: values.expiresAt || undefined,
    });
  };

  if (issue.isSuccess && issue.data) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <h2 className="text-xl font-semibold">Credential Issued</h2>
            <p className="text-sm text-muted-foreground">
              The credential has been issued to{' '}
              <span className="font-mono">{issue.data.subjectDID.slice(0, 20)}…</span>
            </p>
            <div className="mt-2 rounded-md bg-muted px-4 py-2 font-mono text-xs">
              {issue.data.id}
            </div>
            <Button onClick={() => issue.reset()} className="mt-4">
              Issue Another
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Issue Credential"
        description="Issue a verifiable credential to a user's DID"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subject</CardTitle>
            <CardDescription>The DID of the user receiving this credential</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="subjectDID">Subject DID</Label>
              <Input id="subjectDID" placeholder="did:stellar:G…" {...register('subjectDID')} />
              {errors.subjectDID && <p className="text-xs text-destructive">{errors.subjectDID.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credential Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <Select id="type" {...register('type')}>
                {CREDENTIAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </div>

            <Separator />

            {/* Conditional claims fields */}
            {(selectedType === 'AgeCredential') && (
              <div className="space-y-1.5">
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" min={0} max={200} placeholder="25" {...register('age')} />
              </div>
            )}
            {(selectedType === 'ResidencyCredential') && (
              <div className="space-y-1.5">
                <Label htmlFor="country">Country Code</Label>
                <Input id="country" placeholder="US" maxLength={2} {...register('country')} />
              </div>
            )}
            {(selectedType === 'AccreditedInvestorCredential') && (
              <div className="flex items-center gap-2">
                <input id="accredited" type="checkbox" {...register('accredited')} className="h-4 w-4" />
                <Label htmlFor="accredited">Confirmed accredited investor</Label>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expiry</CardTitle>
            <CardDescription>Optional — leave blank for no expiry</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="expiresAt">Expiry Date</Label>
              <Input id="expiresAt" type="date" {...register('expiresAt')} />
            </div>
          </CardContent>
        </Card>

        {issue.isError && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {(issue.error as Error).message}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={issue.isPending}>
          {issue.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Issuing…</>
          ) : (
            <><FilePlus className="mr-2 h-4 w-4" />Issue Credential</>
          )}
        </Button>
      </form>
    </div>
  );
}
