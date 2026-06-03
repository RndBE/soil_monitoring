declare module "bcryptjs" {
  export function hashSync(data: string, saltOrRounds?: string | number): string;
  export function compare(data: string, encrypted: string): Promise<boolean>;

  const bcrypt: {
    hashSync: typeof hashSync;
    compare: typeof compare;
  };

  export default bcrypt;
}
