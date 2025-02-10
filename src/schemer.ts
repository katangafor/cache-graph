/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ZodTypeAny, infer as ZodInfer, ZodError } from 'zod';

type withSchemerArgs<
  TArgs extends unknown[],
  TReturn extends Promise<any>,
  TSchema extends ZodTypeAny
> = {
  fn: (...args: TArgs) => TReturn;
  tag: string;
  handleData: (argObj: { data: Awaited<TReturn>; tag: string }) => Promise<any>;
  handleError: (argObj: {
    data: Awaited<TReturn>;
    tag: string;
    errorMessage: string;
  }) => Promise<any>;
  schema?: TSchema;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// a function that takes any args and any return type (as long as it's a promise),
// calls the function with the args, and does whatever with it, then returns the result
export const withSchemer = <
  TArgs extends unknown[],
  TReturn extends Promise<any>,
  TSchema extends ZodTypeAny
>({
  fn,
  tag,
  handleData,
  handleError,
  schema
}: withSchemerArgs<TArgs, TReturn, TSchema>) => {
  return async (
    ...args: TArgs
  ): Promise<TSchema extends ZodTypeAny ? ZodInfer<TSchema> : Awaited<TReturn>> => {
    const data = await fn(...args);
    if (schema) {
      const parsedData = schema.safeParse(data);
      if (!parsedData.success) {
        await handleError({ data, tag, errorMessage: parsedData.error.toString() });
      }
      // even if it doesn't validate, we want to assert it as the given type
      return data as unknown as ZodInfer<TSchema>;
    }

    await handleData({ data, tag });
    // hm not sure what to do about this. TS knows this is Awaited<TReturn>,
    // but maybe it's not convinced this fulfills the generic constraint?
    data;
    return data;
    //     ^?
  };
};

// confirmed, this works. no runtime errors, with or without a schema
export const genSchemer = ({
  handleData,
  handleError
}: {
  handleData: withSchemerArgs<any, any, any>['handleData'];
  handleError: withSchemerArgs<any, any, any>['handleError'];
}) => {
  return <TArgs extends unknown[], TReturn extends Promise<any>, TSchema extends ZodTypeAny>(
    args: Omit<withSchemerArgs<TArgs, TReturn, TSchema>, 'handleData' | 'handleError'>
  ) => {
    return withSchemer({ ...args, handleData, handleError });
  };
};
