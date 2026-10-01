import { describe,it,expect } from 'vitest';
import { calculateTotals,assertTransition,personalizationPrice,currency } from '../../packages/commerce/src';
import { verifySignature } from '../../packages/integrations/src';
import { checkoutSchema,productSchema } from '../../packages/validation/src';
import { createHmac } from 'node:crypto';
describe('authoritative commerce rules',()=>{
  it('calculates integer paise and free-shipping thresholds',()=>{expect(calculateTotals(249999)).toEqual({subtotal:249999,discount:0,shipping:9900,tax:0,total:259899});expect(calculateTotals(250000).shipping).toBe(0);});
  it('rounds discounts down, caps them and evaluates shipping after discount',()=>{expect(calculateTotals(250001,{percent:10,minimum:100000,maxDiscount:20000})).toEqual({subtotal:250001,discount:20000,shipping:9900,tax:0,total:239901});});
  it('rejects invalid totals and coupon minimum violations',()=>{expect(()=>calculateTotals(-1)).toThrow();expect(()=>calculateTotals(10.5)).toThrow();expect(()=>calculateTotals(500,{percent:10,minimum:1000})).toThrow();});
  it('allows valid fulfillment and refuses skipped or terminal transitions',()=>{expect(()=>assertTransition('PAID','PROCESSING')).not.toThrow();expect(()=>assertTransition('PENDING_PAYMENT','SHIPPED')).toThrow();expect(()=>assertTransition('DELIVERED','PACKED')).toThrow();expect(()=>assertTransition('REFUNDED','PAID')).toThrow();});
  const fields=[{key:'name',label:'Name',type:'text',required:true,maxLength:10,options:[],priceAdjustment:15000},{key:'finish',label:'Finish',type:'select',required:false,maxLength:20,options:['Gold','Silver'],priceAdjustment:5000}];
  it('prices only validated customization values',()=>{expect(personalizationPrice(fields,{name:'Meera',finish:'Gold'})).toBe(20000);expect(personalizationPrice(fields,{name:'Meera'})).toBe(15000);});
  it('rejects missing, overlong, unknown and unsupported choices',()=>{expect(()=>personalizationPrice(fields,{})).toThrow('required');expect(()=>personalizationPrice(fields,{name:'A'.repeat(11)})).toThrow('too long');expect(()=>personalizationPrice(fields,{name:'Meera',price:'1'})).toThrow('Unknown');expect(()=>personalizationPrice(fields,{name:'Meera',finish:'Platinum'})).toThrow('Invalid');});
  it('does not charge for unchecked custom checkboxes',()=>{expect(personalizationPrice([{key:'wrap',label:'Wrap',type:'checkbox',required:false,maxLength:5,options:[],priceAdjustment:7500}],{wrap:'false'})).toBe(0);});
  it('formats currency through a shared formatter',()=>expect(currency(150000)).toBe('₹1,500'));
});
describe('payment and payload security',()=>{
  it('verifies the exact raw webhook bytes and rejects malformed signatures',()=>{const bytes=Buffer.from('{"amount":100}'),secret='unit-only-secret';const signature=createHmac('sha256',secret).update(bytes).digest('hex');expect(verifySignature(bytes,signature,secret)).toBe(true);expect(verifySignature(Buffer.from('{"amount":1}'),signature,secret)).toBe(false);expect(verifySignature(bytes,'zz',secret)).toBe(false);expect(verifySignature(bytes,signature,'wrong')).toBe(false);});
  it('rejects client financial fields at checkout',()=>{expect(checkoutSchema.safeParse({email:'a@example.com',total:1}).success).toBe(false);});
  it('rejects mass-assigned permissions on a product',()=>expect(productSchema.safeParse({title:'A bowl',permissions:['*']}).success).toBe(false));
});
