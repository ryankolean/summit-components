import { z } from "zod";
export declare const MaintenanceTier: z.ZodObject<{
    name: z.ZodString;
    monthlyFee: z.ZodNumber;
    includedUpdateHours: z.ZodNumber;
    inclusions: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
/** Summit-wide pricing. Every estimate, contract and proposal is computed from it. */
export declare const RateCardSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    example: z.ZodDefault<z.ZodBoolean>;
    currency: z.ZodDefault<z.ZodLiteral<"USD">>;
    hourlyRate: z.ZodNumber;
    afterHoursRate: z.ZodNumber;
    effortHours: z.ZodObject<{
        xs: z.ZodNumber;
        s: z.ZodNumber;
        m: z.ZodNumber;
        l: z.ZodNumber;
        xl: z.ZodNumber;
    }, z.core.$strip>;
    adoptFactor: z.ZodDefault<z.ZodNumber>;
    pageHours: z.ZodNumber;
    redirectHours: z.ZodDefault<z.ZodNumber>;
    baseline: z.ZodDefault<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        hours: z.ZodNumber;
    }, z.core.$strip>>>;
    depositPercent: z.ZodDefault<z.ZodNumber>;
    tiers: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        monthlyFee: z.ZodNumber;
        includedUpdateHours: z.ZodNumber;
        inclusions: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
    contractDefaults: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    contractTemplate: z.ZodOptional<z.ZodString>;
    proposals: z.ZodDefault<z.ZodObject<{
        project: z.ZodDefault<z.ZodString>;
        workersSubdomain: z.ZodOptional<z.ZodString>;
        baseUrl: z.ZodOptional<z.ZodURL>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const LineItem: z.ZodObject<{
    label: z.ZodString;
    hours: z.ZodOptional<z.ZodNumber>;
    amount: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
/** One client's commercial terms. Private: it names the client's legal entity and contacts. */
export declare const EngagementSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    client: z.ZodString;
    clientLegalName: z.ZodString;
    proposalSlug: z.ZodString;
    preparedOn: z.ZodString;
    validDays: z.ZodDefault<z.ZodNumber>;
    tier: z.ZodOptional<z.ZodString>;
    lineItems: z.ZodDefault<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        hours: z.ZodOptional<z.ZodNumber>;
        amount: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>>;
    discount: z.ZodOptional<z.ZodObject<{
        label: z.ZodString;
        amount: z.ZodNumber;
    }, z.core.$strip>>;
    exclusions: z.ZodDefault<z.ZodArray<z.ZodString>>;
    links: z.ZodDefault<z.ZodObject<{
        preview: z.ZodOptional<z.ZodURL>;
        styleGuide: z.ZodOptional<z.ZodURL>;
    }, z.core.$strip>>;
    contract: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>>;
}, z.core.$strip>;
export type RateCardInput = z.input<typeof RateCardSchema>;
export type RateCard = z.output<typeof RateCardSchema>;
export type EngagementInput = z.input<typeof EngagementSchema>;
export type Engagement = z.output<typeof EngagementSchema>;
