import { z } from "zod";
/**
 * Public facts about a business. This is the single source for page copy,
 * JSON-LD and llms.txt, and it is committed to the site repo, which is often
 * public. Never put private intake here (pain points, competitors, pricing
 * notes, personal contacts): that lives in the private Summit repo.
 */
export declare const Day: z.ZodEnum<{
    Mo: "Mo";
    Tu: "Tu";
    We: "We";
    Th: "Th";
    Fr: "Fr";
    Sa: "Sa";
    Su: "Su";
}>;
/** `closes` earlier than `opens` means the period runs past midnight. */
export declare const OpeningHours: z.ZodObject<{
    days: z.ZodArray<z.ZodEnum<{
        Mo: "Mo";
        Tu: "Tu";
        We: "We";
        Th: "Th";
        Fr: "Fr";
        Sa: "Sa";
        Su: "Su";
    }>>;
    opens: z.ZodString;
    closes: z.ZodString;
}, z.core.$strip>;
export declare const Address: z.ZodObject<{
    street: z.ZodString;
    locality: z.ZodString;
    region: z.ZodString;
    postalCode: z.ZodString;
    country: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const Location: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    address: z.ZodObject<{
        street: z.ZodString;
        locality: z.ZodString;
        region: z.ZodString;
        postalCode: z.ZodString;
        country: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>;
    geo: z.ZodOptional<z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, z.core.$strip>>;
    telephone: z.ZodOptional<z.ZodString>;
    hours: z.ZodDefault<z.ZodArray<z.ZodObject<{
        days: z.ZodArray<z.ZodEnum<{
            Mo: "Mo";
            Tu: "Tu";
            We: "We";
            Th: "Th";
            Fr: "Fr";
            Sa: "Sa";
            Su: "Su";
        }>>;
        opens: z.ZodString;
        closes: z.ZodString;
    }, z.core.$strip>>>;
    hoursNote: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const MenuItem: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    price: z.ZodOptional<z.ZodString>;
    dietary: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const MenuSection: z.ZodObject<{
    name: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        price: z.ZodOptional<z.ZodString>;
        dietary: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const Menu: z.ZodObject<{
    name: z.ZodString;
    url: z.ZodOptional<z.ZodString>;
    sections: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        items: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            price: z.ZodOptional<z.ZodString>;
            dietary: z.ZodDefault<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const Faq: z.ZodObject<{
    question: z.ZodString;
    answer: z.ZodString;
}, z.core.$strip>;
export declare const Image: z.ZodObject<{
    src: z.ZodString;
    alt: z.ZodString;
    width: z.ZodNumber;
    height: z.ZodNumber;
    caption: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const TeamMember: z.ZodObject<{
    name: z.ZodString;
    role: z.ZodString;
    bio: z.ZodOptional<z.ZodString>;
    image: z.ZodOptional<z.ZodObject<{
        src: z.ZodString;
        alt: z.ZodString;
        width: z.ZodNumber;
        height: z.ZodNumber;
        caption: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const EntitySchema: z.ZodObject<{
    name: z.ZodString;
    legalName: z.ZodOptional<z.ZodString>;
    type: z.ZodDefault<z.ZodString>;
    description: z.ZodString;
    url: z.ZodURL;
    email: z.ZodOptional<z.ZodEmail>;
    telephone: z.ZodOptional<z.ZodString>;
    locations: z.ZodArray<z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        address: z.ZodObject<{
            street: z.ZodString;
            locality: z.ZodString;
            region: z.ZodString;
            postalCode: z.ZodString;
            country: z.ZodDefault<z.ZodString>;
        }, z.core.$strip>;
        geo: z.ZodOptional<z.ZodObject<{
            lat: z.ZodNumber;
            lng: z.ZodNumber;
        }, z.core.$strip>>;
        telephone: z.ZodOptional<z.ZodString>;
        hours: z.ZodDefault<z.ZodArray<z.ZodObject<{
            days: z.ZodArray<z.ZodEnum<{
                Mo: "Mo";
                Tu: "Tu";
                We: "We";
                Th: "Th";
                Fr: "Fr";
                Sa: "Sa";
                Su: "Su";
            }>>;
            opens: z.ZodString;
            closes: z.ZodString;
        }, z.core.$strip>>>;
        hoursNote: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    menus: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        url: z.ZodOptional<z.ZodString>;
        sections: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            items: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                description: z.ZodOptional<z.ZodString>;
                price: z.ZodOptional<z.ZodString>;
                dietary: z.ZodDefault<z.ZodArray<z.ZodString>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>>;
    faq: z.ZodDefault<z.ZodArray<z.ZodObject<{
        question: z.ZodString;
        answer: z.ZodString;
    }, z.core.$strip>>>;
    team: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        role: z.ZodString;
        bio: z.ZodOptional<z.ZodString>;
        image: z.ZodOptional<z.ZodObject<{
            src: z.ZodString;
            alt: z.ZodString;
            width: z.ZodNumber;
            height: z.ZodNumber;
            caption: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    gallery: z.ZodDefault<z.ZodArray<z.ZodObject<{
        src: z.ZodString;
        alt: z.ZodString;
        width: z.ZodNumber;
        height: z.ZodNumber;
        caption: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    sameAs: z.ZodDefault<z.ZodArray<z.ZodURL>>;
}, z.core.$strip>;
export type EntityInput = z.input<typeof EntitySchema>;
export type Entity = z.output<typeof EntitySchema>;
